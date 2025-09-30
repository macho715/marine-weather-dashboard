"""Weather Vessel 기본 모델. Weather Vessel base models."""

from __future__ import annotations

from pydantic import BaseModel


class LogiBaseModel(BaseModel):
    """물류 기본 모델. Logistics base model."""

    class Config:
        """Pydantic 설정. Pydantic configuration."""

        use_enum_values = True
        validate_assignment = True
        extra = "forbid"
