import requests_mock
from door_controller import DoorController
from dotenv import load_dotenv
import os

# Load credentials from .env
load_dotenv()


ISAPI_ENDPOINT = os.getenv("DOOR_CONTROLLER_ENDPOINT")
def test_open_barrier_success():
    with requests_mock.Mocker() as m:
        m.put(ISAPI_ENDPOINT, status_code=200)
        controller = DoorController()
        result = controller.open_barrier()
        assert result["message"] == "Barrier opened"

def test_open_barrier_failure():
    with requests_mock.Mocker() as m:
        m.put(ISAPI_ENDPOINT, status_code=403)
        controller = DoorController()
        result = controller.open_barrier()
        assert "error" in result
