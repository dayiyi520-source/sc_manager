#!/bin/bash
files=$(find src -type f -name "*.tsx")
for file in $files; do
  sed -i -E 's/bg-gray-500\/10/bg-\[#2C3440\]/g' $file
  sed -i -E 's/bg-gray-500\/15/bg-\[#2C3440\]/g' $file
  sed -i -E 's/text-gray-400/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/border-gray-500\/30/border-\[#3A4655\]/g' $file
done
