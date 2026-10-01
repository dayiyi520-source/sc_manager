#!/bin/bash
files=$(find src -type f -name "*.tsx")
for file in $files; do
  sed -i -e 's/bg-\[#0A0A0B\]/bg-\[#0C0F13\]/g' $file
  sed -i -e 's/bg-\[#1E1E22\]/bg-\[#151A22\]/g' $file
  sed -i -e 's/text-\[#EEEEEE\]/text-\[#F8FAFC\]/g' $file
  sed -i -e 's/text-\[#71717A\]/text-\[#7C8796\]/g' $file
  
  # specific drawer & modal backgrounds might still use old colors if they were hand-coded
  # Let's ensure the Drawer and Modal are using BeyondOrbit styles
  sed -i -e 's/bg-\[#121214\]/bg-\[#121923\]/g' $file
done
