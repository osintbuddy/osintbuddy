
import os
from casdoor import CasdoorSDK # AsyncCasdoorSDK
from core.config import settings

class Config:
    CASDOOR_SDK = CasdoorSDK(
        endpoint=settings.CASDOOR_ENDPOINT,
        client_id=settings.VITE_CASDOOR_CLIENT_ID,
        client_secret=settings.CASDOOR_CLIENT_SECRET,
        certificate=settings.CASDOOR_CERT,
        org_name=settings.VITE_CASDOOR_ORG_NAME,
        application_name=settings.VITE_CASDOOR_APP_NAME,
    )
    REDIRECT_URI = 'http://localhost:5173/callback'
    SECRET_TYPE = 'filesystem'
    SECRET_KEY = os.urandom(24)
