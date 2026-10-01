#!/bin/bash

# Find all tsx files
files=$(find src -type f -name "*.tsx")

for file in $files; do
  # Backgrounds
  sed -i -e 's/bg-\[#0F0F11\]/bg-\[#0C0F13\]/g' $file
  sed -i -e 's/bg-\[#0E0E11\]/bg-\[#0C0F13\]/g' $file
  sed -i -e 's/bg-\[#141417\]/bg-\[#0B111A\]/g' $file
  sed -i -e 's/bg-\[#121214\]/bg-\[#121923\]/g' $file
  sed -i -e 's/bg-\[#18181C\]/bg-\[#0D1620\]/g' $file
  sed -i -e 's/bg-\[#16161A\]/bg-\[#151A22\]/g' $file
  sed -i -e 's/bg-\[#1C1C20\]/bg-\[#18212C\]/g' $file
  sed -i -e 's/bg-\[#1C1C22\]/bg-\[#18212C\]/g' $file
  sed -i -e 's/bg-\[#202024\]/bg-\[#18212C\]/g' $file
  sed -i -e 's/bg-\[#252529\]/bg-\[#2C3440\]/g' $file
  
  # Borders
  sed -i -e 's/border-\[#1E1E22\]/border-\[#2C3440\]/g' $file
  sed -i -e 's/border-\[#252529\]/border-\[#2C3440\]/g' $file
  sed -i -e 's/border-\[#38383F\]/border-\[#3A4655\]/g' $file
  
  # Text
  sed -i -e 's/text-\[#8E8E93\]/text-\[#A5ADBA\]/g' $file
  sed -i -e 's/text-\[#A1A1AA\]/text-\[#A5ADBA\]/g' $file
  sed -i -e 's/text-\[#D1D1D1\]/text-\[#F8FAFC\]/g' $file
  sed -i -e 's/text-\[#E0E0E0\]/text-\[#F8FAFC\]/g' $file
  sed -i -e 's/text-white/text-\[#F8FAFC\]/g' $file
  sed -i -e 's/text-black/text-\[#F8FAFC\]/g' $file
  
  # Primary Brand (assuming indigo or C5A059 was primary, though some used C5A059 for accent)
  sed -i -e 's/bg-\[#C5A059\]/bg-\[#2F66F6\]/g' $file
  sed -i -e 's/hover:bg-\[#B38F48\]/hover:bg-\[#3B73FF\]/g' $file
  sed -i -e 's/text-\[#C5A059\]/text-\[#6EA0FF\]/g' $file
  sed -i -e 's/border-\[#C5A059\]/border-\[#2F66F6\]/g' $file
  
  # Replace standard indigo with primary brand
  sed -i -e 's/bg-indigo-600/bg-\[#2F66F6\]/g' $file
  sed -i -e 's/bg-indigo-500/bg-\[#2F66F6\]/g' $file
  sed -i -e 's/hover:bg-indigo-700/hover:bg-\[#3B73FF\]/g' $file
  sed -i -e 's/text-indigo-400/text-\[#6EA0FF\]/g' $file
  
  # Specific components like Drawer might use black bg
  sed -i -e 's/bg-black/bg-\[#0C0F13\]/g' $file
  
done
