import sys
import os
import sqlite3
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.analytics.predictive_service import (
    init_sqlite_db,
    DataCollectorService,
    FeatureEngineeringService,
    SentimentService,
    PredictionEngine,
    ExplanationService,
    IncrementalTrainer,
    DB_PATH
)

def run_tests():
    print("=== STARTING BACKEND SERVICES INTEGRATION TEST ===")
    
    # 1. Init Database
    print("\n[Step 1] Initializing SQLite Database...")
    init_sqlite_db()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"Tables in SQLite database: {tables}")
    conn.close()
    
    assert len(tables) >= 3, "Database initialization failed - missing tables."
    print("Database tables initialized successfully.")
    
    # 2. Collector and Pretraining test
    test_symbol = "TCS.NS"
    print(f"\n[Step 2] Collecting data and pretraining models for {test_symbol}...")
    
    # Clear past entries for test stability
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM candles WHERE symbol = ?", (test_symbol,))
    cursor.execute("DELETE FROM predictions WHERE symbol = ?", (test_symbol,))
    cursor.execute("DELETE FROM model_updates WHERE symbol = ?", (test_symbol,))
    conn.commit()
    conn.close()
    
    # Run collection
    DataCollectorService.collect_historical_data(test_symbol)
    
    # Run pretraining
    IncrementalTrainer.pretrain_on_history(test_symbol, "2h")
    IncrementalTrainer.pretrain_on_history(test_symbol, "1d")
    
    # Verify database counts
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM candles WHERE symbol = ?", (test_symbol,))
    candles_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM model_updates WHERE symbol = ?", (test_symbol,))
    updates_count = cursor.fetchone()[0]
    conn.close()
    
    print(f"Candles saved: {candles_count}")
    print(f"Model updates saved: {updates_count}")
    assert candles_count > 50, "Candle collection failed."
    assert updates_count > 0, "Model pretraining failed."
    
    # 3. Sentiment Fetch test
    print(f"\n[Step 3] Fetching news headlines & analyzing with FinBERT...")
    sent_data = SentimentService.fetch_headlines_and_sentiment(test_symbol)
    print(f"FinBERT Sentiment Score: {sent_data['score']} ({sent_data['classification']})")
    print(f"Sample news headline: {sent_data['headlines'][0]['title'] if sent_data['headlines'] else 'None'}")
    
    # 4. Feature Extraction & Prediction test
    print(f"\n[Step 4] Running Feature Engineering and River Prediction...")
    df_5m = FeatureEngineeringService.get_features_df(test_symbol, "5m", sentiment_score=sent_data["score"])
    assert not df_5m.empty, "Feature engineering failed (empty dataframe)."
    
    feat_dict = FeatureEngineeringService.extract_latest_feature_dict(df_5m)
    print("Latest feature vector keys:", list(feat_dict.keys()))
    
    prediction = PredictionEngine.predict_stock(test_symbol, feat_dict, "2h")
    print(f"Prediction result: {prediction}")
    assert "direction" in prediction, "Prediction direction missing."
    assert "confidence" in prediction, "Prediction confidence missing."
    
    # 5. Explainability test
    print(f"\n[Step 5] Checking Dynamic AI Explanation Service...")
    explanation = ExplanationService.generate_explanation(test_symbol, prediction["direction"], feat_dict)
    print(f"Explainability Output: '{explanation}'")
    assert len(explanation) > 10, "Explanation generation failed."
    
    # 6. Evaluation & Incremental Update test
    print(f"\n[Step 6] Testing Incremental learning loop (evaluating pending predictions)...")
    # Simulate a prediction made 2 hours ago
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    import datetime
    past_time_str = (datetime.datetime.utcnow() - datetime.timedelta(hours=2, minutes=5)).isoformat()
    
    cursor.execute("""
        INSERT INTO predictions (symbol, prediction_time, target_type, predicted_direction, confidence, expected_return, explanation, features, is_evaluated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        test_symbol, past_time_str, "2h", "Bullish", 0.82, 0.70, "Test explain", json.dumps(feat_dict)
    ))
    conn.commit()
    conn.close()
    
    # Run evaluation
    samples_learned = IncrementalTrainer.evaluate_and_train_live(test_symbol)
    print(f"Samples evaluated and learned incrementally: {samples_learned}")
    
    # Check updated stats
    metrics = IncrementalTrainer.get_monitoring_metrics(test_symbol)
    print(f"Model Monitoring Metrics: {metrics}")
    
    print("\n=== ALL BACKEND INTEGRATION TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
