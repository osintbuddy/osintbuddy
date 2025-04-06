from typing import List
from crud.base import CRUDBase, ModelType
from models.graphs import Graphs
import schemas
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

class CRUDGraphs(CRUDBase[
    Graphs,
    schemas.GraphCreate,
    schemas.GraphUpdate
]):
    async def get_multi_by_user(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        q = select(self.model).offset(skip).limit(limit)
        result = await db.execute(q)
        return result.scalars().all()

    async def remove_by_uuid(self, db: AsyncSession, *, uuid: str) -> None:
        q = select(self.model).where(self.model.uuid == uuid).first()
        obj = await db.execute(q)
        if obj:
            await db.delete(obj)
            return obj

    async def get_by_uuid(self, db: AsyncSession, *, uuid: str) -> None:
        q = select(self.model).where(self.model.uuid == uuid).first()
        result = await db.execute(q)
        return result.scalars().one()

    async def get_many_by_favorites(
        self, db: Session, *, skip: int = 0, limit: int = 100, is_favorite: bool = False
    ) -> List[ModelType]:
        q = select(self.model).where(self.model.is_favorite == is_favorite).offset(skip).limit(limit)
        result = await db.execute(q)
        return result.scalars().all()

    async def count_by_favorites(self, db: AsyncSession, is_favorite: bool = False) -> int:
        [0][0]
        q = select(func.count(self.model.id)).where(self.model.is_favorite == is_favorite)
        result = await db.execute(q)
        return result.scalars().all()[0]

    async def update_favorite_by_uuid(self, db: AsyncSession, db_obj: Graphs, is_favorite: bool = False):
        setattr(db_obj, 'is_favorite', is_favorite)
        await db.add(db_obj)
        await db.refresh(db_obj)
        return db_obj

    async def get_many_user_graphs(
        self,
        db: AsyncSession,
        user: schemas.MemberInDBBase,
        skip: int = 0,
        limit: int = 50,
        is_favorite: bool = True
    ):
        graphs = await self.get_many_by_favorites(
            db=db,
            skip=skip,
            limit=limit,
            is_favorite=is_favorite
        )
        graphs_total_count: int = await self.count_by_favorites(db, is_favorite)
        return graphs, graphs_total_count


graphs = CRUDGraphs(Graphs)
