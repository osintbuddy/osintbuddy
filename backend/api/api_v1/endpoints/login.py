from typing import Union
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Request, HTTPException

from api import deps
import models, schemas
from core.logger import get_logger
from api.utils import APIRequest, dkeys_to_snake_case
from crud.base import get_or_create_model


log = get_logger("api_v1.endpoints.login")
router = APIRouter(prefix="/auth")


@router.post("/sign-in", response_model=Union[schemas.Status, schemas.HTTPError])
async def post_signin(
    code: str,
    request: APIRequest,
    db: Session = Depends(deps.get_db),
):
    try:
        sdk = request.app.state.CASDOOR_SDK
        casdoor_tokens = sdk.get_oauth_token(code)
        tokens = schemas.CasdoorTokens(**casdoor_tokens)
    
        casdoor_user = sdk.parse_jwt_token(tokens.access_token)
        request.session["member"] = casdoor_user
        # casdoor returns camelCase and the osintbuddy db convention is to use snake_case
        user_in = dkeys_to_snake_case(casdoor_user.copy())
        # casdoor_user["id"] is referenced in the models.User as cid
        user_in["cid"] = casdoor_user.get("id")
        user = schemas.MemberInDBBase(**user_in).model_dump()
        user_out = await get_or_create_model(db, models.Member, **user)
        return {"status": "ok"}
    except Exception as e:
        log.error("Error in login.post_signin:")
        log.error(e)
        print(e)
        return HTTPException(
            status_code=401,
            detail="Unauthorized."
        )


@router.post("/sign-out", response_model=schemas.Status)
async def post_signout(request: Request):
    del request.session["member"]
    return {"status": "ok"}
