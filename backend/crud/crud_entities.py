from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase, ModelType
from models.entities import Entities
from schemas.entities import EntityCreate, EntityUpdate


class CRUDEntities(CRUDBase[
    Entities,
    EntityCreate,
    EntityUpdate
]):
    def get_multi_by_user(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def delete_by_uuid(
        self, db: AsyncSession, *, uuid
    ) -> None:
        obj = db.query(self.model).where(self.model.uuid == uuid).first()
        db.delete(obj)
        return obj

    def get_by_uuid(
        self, db: AsyncSession, *, uuid: str = None
    ) -> List[ModelType]:
        return db.query(self.model).where(self.model.uuid == uuid).first()

    def get_by_label(
        self, db: AsyncSession, *, label: str = None
    ) -> List[ModelType]:
        return db.query(self.model).where(self.model.label == label).first()

    def update_favorite_by_id(self, db: AsyncSession, db_obj: Entities, is_favorite: bool = False):
        setattr(db_obj, 'is_favorite', is_favorite)
        db.add(db_obj)
        db.refresh(db_obj)
        return db_obj

    def get_many_by_favorites(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, is_favorite: bool = False
    ) -> List[ModelType]:
        entities = db.query(self.model.id, self.model.is_favorite, self.model.last_edited, self.model.label, self.model.description, self.model.author).where(self.model.is_favorite == is_favorite).offset(skip).limit(limit).all()
        entities_count = self.count_by_favorites(db, is_favorite=is_favorite)[0][0]
        return entities, entities_count

    async def count_by_favorites(self, db: AsyncSession, is_favorite: bool = False) -> int:
        q = select(func.count(self.model.id)).where(self.model.is_favorite == is_favorite).all()
        result = await db.execute(q)
        return result


entities = CRUDEntities(Entities)
