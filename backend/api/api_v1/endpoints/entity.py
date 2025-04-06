import os, importlib, inspect
from uuid import UUID
from typing import Annotated

from schemas.entities import ENTITY_NAMESPACE, Entity
from api.utils import get_hid
import httpx
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from starlette import status
from osintbuddy.utils import to_snake_case
from osintbuddy.templates import plugin_source_template 
import requests

from api import deps
import crud, schemas
from core.logger import get_logger

log = get_logger("api_v1.endpoints.entities")
router = APIRouter(prefix="/entity")


@router.get("/plugins/transform/")
async def get_entity_transforms(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    label: str
):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://plugins:42562/transforms?label={to_snake_case(label)}")
        transforms = response.json()
        return {
            "type": label,
            "transforms": transforms,
        }


@router.get("/details/{hid}")
async def get_entity(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid,
):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://plugins:42562/entities/{hid}")
        entity = response.json()
        return entity


@router.get("")
async def get_entities(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
):
    async with httpx.AsyncClient() as client:
        response = await client.get("http://plugins:42562/entities")
        entities = response.json()
        return entities


@router.post("")
async def create_entity(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    entity: schemas.PostEntityCreate,
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        obj_in = schemas.EntityCreate(
            label=entity.label,
            author=entity.author,
            description=entity.description,
            source=plugin_source_template(
                label=entity.label,
                description=entity.description,
                author=entity.author
            )
        )
        return await crud.entities.create(db, obj_in)
    except Exception as e:
        log.error('Error inside entity.create_entity:')
        log.error(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error creating your entity. Please try again"
        )


@router.put("/{hid}")
async def update_entity_by_id(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_entity_id)],
    obj_in: schemas.EntityUpdate,
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        db_obj = await crud.entities.get(db=db, id=hid)
        entity = await crud.entities.update(db=db, db_obj=db_obj, obj_in=obj_in)
        return entity
    except Exception as e:
        log.error('Error inside entity.update_entity_by_id:')
        log.error(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error updating your entity. Please try again"
        )


@router.delete("/{hid}")
async def delete_entity(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_entity_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        return crud.entities.remove(db=db, id=hid)
    except Exception as e:
        log.error('Error inside entity.delete_entity:')
        log.error(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error getting your entities. Please try again"
        )


@router.put("/{hid}/favorite")
async def update_entity_favorite_id(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_entity_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        obj_in = crud.entities.get(db=db, id=hid)
        updated_entity = crud.entities.update_favorite_by_id(
            db,
            obj_in,
            is_favorite=not obj_in.is_favorite
        )
        return updated_entity
    except Exception as e:
        log.error('Error inside entity.update_favorite_entity_uuid:')
        log.error(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error updating your favorite entities. Please try again"
        )
