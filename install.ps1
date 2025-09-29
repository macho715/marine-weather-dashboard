Write-Output "=== Marine Cursor MDC Rules 설치 시작 ==="

# 1) ZIP 풀기 (동일 파일 덮어쓰기)
Expand-Archive -Force "marine-cursor-mdc-rules.zip" "."

# 2) Git 추가
git add .cursor config docs .github .gitmessage.txt

# 3) 커밋 템플릿 설정
git config commit.template .gitmessage.txt

Write-Output "=== 설치 완료 ==="
Write-Output "PR 작성 시 .github/pull_request_template.md 자동 적용"
