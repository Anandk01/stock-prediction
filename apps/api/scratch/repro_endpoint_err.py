import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from core.models import User
from core.database import get_engine

def test_endpoint():
    print("Testing /api/stocks/update endpoint...")
    client = TestClient(app)
    
    # We need a dummy user for auth if needed
    # But wait, in router.py:
    # get_current_user is a dependency:
    # @stocks_router.post("/update")
    # async def update_stock_predictions(request: StockUpdateRequest, user=Depends(get_current_user)):
    
    # Let's override the dependency get_current_user to return a dummy user
    from modules.auth.router import get_current_user
    
    class DummyUser:
        id = "dummy_user_id"
        email = "dummy@example.com"
        
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    
    try:
        response = client.post("/api/stocks/update", json={"symbol": "TCS.NS"})
        print(f"Status Code: {response.status_code}")
        print("Response Body:", response.text)
    except Exception as e:
        print("Exception raised:")
        import traceback
        traceback.print_exc()
    finally:
        app.dependency_overrides.clear()

if __name__ == "__main__":
    test_endpoint()
