from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from db.base_class import Base


ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


# https://stackoverflow.com/a/6078058
async def get_or_create_model(session: AsyncSession, model: ModelType, **kwargs):
    instance = await session.execute(select(model).filter_by(**kwargs))
    if instance:
        return instance
    else:
        instance = model(**kwargs)
        session.add(instance)
        session.commit()
        return instance


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD) and count


        **Parameters**

        * `model`: A SQLAlchemy model class
        * `schema`: A Pydantic model (schema) class
        """
        self.model = model

    async def get(self, db: Session, id: Any) -> Optional[ModelType]:
        q = select(self.model).filter(self.model.id == id)
        result = await db.execute(q)
        return result.scalars().one()

    async def count_all(self, db: Session) -> int:
        q = select(func.count(self.model.id))
        result = await db.execute(q)
        return result.scalars().all()

    async def get_many(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        q = select(self.model).offset(skip).limit(limit)
        result = await db.execute(q)

        return result.scalars().all()

    async def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = jsonable_encoder(obj_in)
        print(db, obj_in_data, '+++++++++++++++++++++++')
        db_obj = self.model(**obj_in_data)
        await db.add(db_obj)
        await db.commit()
        return db_obj

    async def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        await db.add(db_obj)
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: Session, *, id: int) -> ModelType:  # noqa
        q = select(self.model).get(id)
        result = await db.execute(q)
        await db.delete(result)
        return result
