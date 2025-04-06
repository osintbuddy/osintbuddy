import uuid
import datetime
from typing import Any
from typing import Generator, Any
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder
from sqlalchemy.pool import PoolProxiedConnection
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, WebSocket, WebSocketException

import crud
import schemas
from db.session import async_session, SessionLocal
from core.logger import get_logger
from api.utils import APIRequest, HidChecker
from core.config import settings


log = get_logger("api.deps")


if "dev" in settings.ENVIRONMENT:
    ___OB_DEV_CID___ = uuid.uuid4()


def getdb() -> Generator[Any, AsyncSession, Any]:
    try:
        db = SessionLocal()
        db.execute(text("LOAD 'age';"))
        db.execute(text('SET search_path = ag_catalog, "$user", public;'))
        yield db
    finally:
        db.close()


async def get_db() -> Generator[Any, AsyncSession, Any]:
    try:
        db = async_session()
        await db.execute(text("LOAD 'age';"))
        await db.execute(text('SET search_path = ag_catalog, "$user", public;'))
        yield db
    finally:
        await db.close()


@asynccontextmanager
async def get_age() -> Generator[Any, PoolProxiedConnection, any]:
    try:
        db = async_session()
        await db.execute(text("BEGIN"))
        await db.execute(text("LOAD 'age';"))
        await db.execute(text('SET search_path = ag_catalog, "$user", public;'))
        yield db
    finally:
        await db.execute(text("COMMIT"))
        await db.close()


async def get_user_from_session(
    request: APIRequest,
    db: Session = Depends(get_db)
) -> schemas.MemberInDBBase:

    if user := request.session.get("member"):
        ob_user: schemas.MemberInDBBase | None = await crud.member.get_by_cid(db=db, cid=user.get("id"))
        if ob_user:
            ob_user = jsonable_encoder(ob_user)
            return schemas.MemberInDBBase(**ob_user)
    if "dev" in settings.ENVIRONMENT:
        return schemas.MemberCreate(
            cid=___OB_DEV_CID___,
            name="DEV",
            username="DEV",
            email="oss@osintbuddy.com",
            avatar="",
            phone="",
            display_name="Dev Account",
            first_name="Dev",
            last_name="eloper",
            is_admin=True,
            created_time=datetime.datetime.now(),
            updated_time=datetime.datetime.now(),
        )
    raise HTTPException(status_code=401, detail="Unauthorized")


async def get_user_from_ws(
    websocket: WebSocket,
    db: Session = Depends(get_db)
) -> schemas.MemberInDBBase:

    if user := websocket.session.get("member"):
        ob_user: schemas.MemberInDBBase | None = await crud.member.get_by_cid(db=db, cid=user.get("id"))
        if ob_user:
            ob_user = jsonable_encoder(ob_user)
            return schemas.MemberInDBBase(**ob_user)
    if "dev" in settings.ENVIRONMENT:
        return schemas.MemberInDBBase(
            cid=___OB_DEV_CID___,
            name="DEV",
            username="DEV",
            email="oss@osintbuddy.com",
            avatar="",
            phone="",
            display_name="Dev Account",
            first_name="Dev",
            last_name="eloper",
            is_admin=True,
            created_time=datetime.datetime.now(),
            updated_time=datetime.datetime.now(),
        )
    raise WebSocketException(code=401)


get_graph_id = HidChecker(namespace=schemas.GRAPH_NAMESPACE)
get_entity_id = HidChecker(namespace=schemas.ENTITY_NAMESPACE)
