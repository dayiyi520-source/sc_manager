#!/bin/bash
files=$(find src -type f -name "*.tsx")

for file in $files; do
  # Progress bar tracks
  sed -i -E 's/bg-slate-200 dark:bg-slate-700/bg-\[#2C3440\]/g' $file
  
  # Table / List divides
  sed -i -E 's/divide-slate-100 dark:divide-\[#2C3440\]/divide-\[#2C3440\]/g' $file
  
  # Hover states
  sed -i -E 's/hover:bg-slate-200 dark:hover:bg-slate-700/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/hover:bg-slate-200/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/dark:hover:bg-slate-700/hover:bg-\[#18212C\]/g' $file
  
  # Fix messed up classes from last script
  sed -i -E 's/bg-\[#18212C\] hover:bg-\[#18212C\] bg-\[#151A22\]/bg-\[#151A22\] hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/bg-\[#18212C\] bg-\[#151A22\] hover:bg-\[#18212C\]/bg-\[#151A22\] hover:bg-\[#18212C\]/g' $file

  # Other dark classes
  sed -i -E 's/dark:bg-slate-700/bg-\[#18212C\]/g' $file
  sed -i -E 's/dark:text-slate-100/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/bg-slate-200/bg-\[#2C3440\]/g' $file
  
  # Ensure no duplicate classes resulting from previous script
  sed -i -E 's/bg-\[#0D1620\] bg-\[#18212C\]/bg-\[#0D1620\]/g' $file
  sed -i -E 's/bg-\[#151A22\] bg-\[#151A22\]/bg-\[#151A22\]/g' $file
  
done
