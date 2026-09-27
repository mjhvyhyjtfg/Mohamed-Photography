#!/bin/bash
# ============================================
#  سكريبت نشر التحديثات — Mohamed Photography
#  كليك مرتين وخلاص! 🚀
# ============================================

cd "$(dirname "$0")"

# ألوان
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}     Mohamed Photography — نشر التحديثات       ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# فحص وجود تغييرات
if git diff --quiet && git diff --cached --quiet; then
  echo -e "${YELLOW}⚠️  مفيش أي تغييرات جديدة!${NC}"
  echo ""
  read -p "اضغط Enter للإغلاق..."
  exit 0
fi

# اظهار التغييرات
echo -e "${YELLOW}📋 الملفات اللي اتغيرت:${NC}"
git status --short
echo ""

# طلب وصف التحديث
echo -e "${CYAN}💬 اكتب وصف التحديث (مثلاً: أضفت عرض جديد):${NC}"
read -p "   > " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="تحديث $(date '+%Y-%m-%d %H:%M')"
fi

echo ""
echo -e "${YELLOW}⏳ جاري رفع التحديثات...${NC}"

# رفع التحديثات
git add .
git commit -m "$COMMIT_MSG"

if git push origin main; then
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✅ تم النشر بنجاح! الموقع هيتحدث خلال 30 ثانية${NC}"
  echo ""
  echo -e "${GREEN}  🌐 رابط موقعك:${NC}"
  echo -e "${GREEN}     https://charming-flan-31815d.netlify.app${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # فتح الموقع تلقائياً
  sleep 2
  open "https://charming-flan-31815d.netlify.app"
else
  echo ""
  echo -e "${RED}❌ حصل خطأ في الرفع. تأكد من الإنترنت وحاول تاني.${NC}"
fi

echo ""
read -p "اضغط Enter للإغلاق..."
