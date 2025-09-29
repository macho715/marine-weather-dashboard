#!/bin/bash
set -e

echo "=== Marine Cursor MDC Rules 설치 시작 ==="

# 1) 압축 해제
unzip -o marine-cursor-mdc-rules.zip -d .

# 2) Git에 추가
git add .cursor config docs .github .gitmessage.txt

# 3) 커밋 템플릿 설정
git config commit.template .gitmessage.txt

echo "=== 설치 완료 ==="
echo "PR 생성 시 .github/pull_request_template.md 자동 적용"
