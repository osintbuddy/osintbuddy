from typing import  Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from crud.base import CRUDBase
from models.member import Member
from schemas.member import MemberCreate, MemberUpdate


class CRUDMembers(CRUDBase[Member, MemberCreate, MemberUpdate]):
    def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[Member]:
        return db.query(Member).filter(Member.email == email).first()

    # get by casdoor account id
    async def get_by_cid(self, db: AsyncSession, *, cid: int) -> Member | None:
        q = select(Member).filter(Member.cid == cid)
        result = await db.execute(q)
        return result.scalars().first()
                

member = CRUDMembers(Member)
