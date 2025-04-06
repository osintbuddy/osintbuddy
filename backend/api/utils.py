import re
from typing import TYPE_CHECKING, Callable, Union, List

from sqids import Sqids
from fastapi import Request
from core.config import settings
# https://github.com/tiangolo/fastapi/issues/632#issuecomment-545790471
APIRequest = Request
if TYPE_CHECKING:
    from fastapi import FastAPI
    from casdoor import CasdoorSDK

    class APIServerState:
        CASDOOR_SDK: CasdoorSDK
        REDIRECT_URI: str
        SECRET_TYPE: str
        SECRET_KEY: str
        def __init__(self) -> None:
            self.CASDOOR_SDK: CasdoorSDK
            self.REDIRECT_URI: str
            self.SECRET_TYPE: str
            self.SECRET_KEY: str


    class APIServer(FastAPI):
        state: APIServerState
        def setup_state(self) -> None:
            self.state = APIServerState()


    class APIRequest(Request):
        app: APIServer


sqids = Sqids(alphabet=settings.SQIDS_ALPHABET, min_length=4)


def get_hid(db_id: int, ns: int = settings.SQIDS_NAMESPACE) -> str:
    """Generate an ID thats easy for humans to work with"""
    return sqids.encode([ns, db_id])


class HidChecker:
    def __init__(self, namespace: str = settings.SQIDS_NAMESPACE):
        self.ns :int = namespace

    def __call__(self, hid: str) -> int:
        decoded: list[int] = sqids.decode(hid)
        return decoded[1]


def dkeys_to_snake_case(data: dict) -> Union[dict, List[dict]]:
    def to_snake(s):
        return re.sub("([A-Z]\w+$)", "_\\1", s).lower()

    if isinstance(data, list):
        return [dkeys_to_snake_case(i) if isinstance(i, (dict, list)) else i for i in data]
    return {to_snake(a):dkeys_to_snake_case(b) if isinstance(b, (dict, list)) else b for a, b in data.items()}

