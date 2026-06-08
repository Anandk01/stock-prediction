import sys
import os
import traceback

# Add current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.analytics.predictive_service import IncrementalTrainer

def test_repro():
    print("Running evaluate_and_train_live diagnostics...")
    symbols = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "AAPL", "AAPL.NS"]
    for sym in symbols:
        try:
            print(f"Testing symbol: {sym}")
            res = IncrementalTrainer.evaluate_and_train_live(sym)
            print(f"Processed: {res} samples successfully.")
        except Exception as e:
            print(f"--- FAILED for {sym} ---")
            traceback.print_exc()

if __name__ == "__main__":
    test_repro()
