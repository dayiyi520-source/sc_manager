#!/bin/bash
file="src/components/project/ProjectDeliveryTicketsView.tsx"

sed -i -E 's/bg-\[#1E1E24\]/bg-\[#121923\]/g' $file
sed -i -E 's/bg-\[#1A1A1E\]/bg-\[#121923\]/g' $file
sed -i -E 's/bg-\[#232328\]/bg-\[#151A22\]/g' $file
sed -i -E 's/bg-\[#2D2D35\]/hover:bg-\[#18212C\]/g' $file
sed -i -E 's/border-\[#2D2D35\]/border-\[#2C3440\]/g' $file
sed -i -E 's/border-\[#3A3A45\]/border-\[#3A4655\]/g' $file
sed -i -E 's/bg-\[#D4AF37\]/bg-\[#2F66F6\]/g' $file
sed -i -E 's/text-\[#D4AF37\]/text-\[#6EA0FF\]/g' $file
sed -i -E 's/text-\[#E2E2E2\]/text-\[#F8FAFC\]/g' $file
sed -i -E 's/text-\[#9A9A9A\]/text-\[#A5ADBA\]/g' $file

file2="src/components/operations/OpsOverviewView.tsx"
sed -i -E 's/bg-\[#2A2A30\]/bg-\[#151A22\]/g' $file2

