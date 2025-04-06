from typing import Annotated, Union

from fastapi import APIRouter, Depends, HTTPException
from starlette import status 

from api.utils import APIRequest
import models, schemas
from core.logger import get_logger
from api import deps

log = get_logger("api_v1.endpoints.users")
router = APIRouter(prefix="/account")


@router.get(
    "/",
    response_model=Union[schemas.MemberInDBBase, schemas.HTTPError],
    response_model_exclude_none=True
)
async def get_account(
    request: APIRequest,
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
) -> models.Member:
    try:
        return user
    except Exception as e:
        log.error("Error inside accounts.get_account:")
        log.error(e)
        del request.session["member"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error: get account"
        )
