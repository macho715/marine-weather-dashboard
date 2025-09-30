"""ERI 규칙 로더. ERI rules loader."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import yaml
from pydantic import BaseModel, Field


class ThresholdRule(BaseModel):
    """임계값 규칙. Threshold rule."""

    variable: str
    operator: str  # "lt", "le", "eq", "ge", "gt"
    threshold: float
    score: float
    description: str


class ERIRuleSet(BaseModel):
    """ERI 규칙 세트. ERI rule set."""

    name: str
    version: str
    rules: List[ThresholdRule] = Field(default_factory=list)
    default_score: float = 50.0

    def evaluate_point(self, data: Dict[str, float]) -> float:
        """데이터 포인트 평가. Evaluate data point.
        
        Args:
            data: 변수별 값 딕셔너리. Dictionary of variable values
            
        Returns:
            ERI 점수 (0-100). ERI score (0-100)
        """
        total_score = 0.0
        rule_count = 0
        
        for rule in self.rules:
            if rule.variable in data:
                value = data[rule.variable]
                if self._evaluate_rule(rule, value):
                    total_score += rule.score
                    rule_count += 1
        
        if rule_count == 0:
            return self.default_score
        
        return min(100.0, max(0.0, total_score / rule_count))

    def _evaluate_rule(self, rule: ThresholdRule, value: float) -> bool:
        """규칙 평가. Evaluate rule."""
        if rule.operator == "lt":
            return value < rule.threshold
        elif rule.operator == "le":
            return value <= rule.threshold
        elif rule.operator == "eq":
            return abs(value - rule.threshold) < 1e-6
        elif rule.operator == "ge":
            return value >= rule.threshold
        elif rule.operator == "gt":
            return value > rule.threshold
        else:
            return False


def load_rule_set(file_path: str | Path) -> ERIRuleSet:
    """YAML 파일에서 규칙 세트 로드. Load rule set from YAML file.
    
    Args:
        file_path: YAML 파일 경로. YAML file path
        
    Returns:
        ERI 규칙 세트. ERI rule set
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    
    return ERIRuleSet(**data)
