from fastapi import APIRouter
from core.config import settings

from .endpoints import entity, graph, graphing, login, account

api_router = APIRouter(prefix=settings.API_V1_STR)

api_router.include_router(graphing.router, tags=["Nodes"])
api_router.include_router(login.router, tags=["Login"])
api_router.include_router(account.router, tags=["Accounts"])
api_router.include_router(graph.router, tags=["Graphs"])
api_router.include_router(entity.router, tags=["Entities"])