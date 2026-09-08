#!/bin/bash
files=$(find src -type f -name "*.tsx")

for file in $files; do
  # Replace common light/dark combos with BeyondOrbit tokens
  
  # Surfaces / Backgrounds
  sed -i -E 's/bg-white dark:bg-slate-900/bg-\[#121923\]/g' $file
  sed -i -E 's/bg-white dark:bg-slate-800/bg-\[#151A22\]/g' $file
  sed -i -E 's/bg-slate-50 dark:bg-slate-900\/50/bg-\[#151A22\]/g' $file
  sed -i -E 's/bg-white/bg-\[#0D1620\]/g' $file
  sed -i -E 's/dark:bg-slate-900/bg-\[#121923\]/g' $file
  sed -i -E 's/dark:bg-slate-800/bg-\[#151A22\]/g' $file
  sed -i -E 's/bg-slate-900/bg-\[#121923\]/g' $file
  sed -i -E 's/bg-slate-800/bg-\[#151A22\]/g' $file
  sed -i -E 's/bg-slate-50/bg-\[#151A22\]/g' $file
  sed -i -E 's/bg-slate-100/bg-\[#18212C\]/g' $file

  # Hover Backgrounds
  sed -i -E 's/hover:bg-slate-50 dark:hover:bg-slate-800\/50/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/hover:bg-slate-50/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/dark:hover:bg-slate-800\/50/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/dark:hover:bg-slate-800/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/hover:bg-slate-100/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/hover:bg-slate-800/hover:bg-\[#18212C\]/g' $file

  # Borders
  sed -i -E 's/border-slate-200\/80 dark:border-slate-800/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-slate-200 dark:border-slate-700/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-slate-200\/60 dark:border-slate-700\/60/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-slate-200/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-slate-100/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-slate-800/border-\[#3A4655\]/g' $file
  sed -i -E 's/border-slate-700/border-\[#3A4655\]/g' $file
  sed -i -E 's/dark:border-slate-800/border-\[#3A4655\]/g' $file
  sed -i -E 's/dark:border-slate-700/border-\[#3A4655\]/g' $file
  sed -i -E 's/divide-slate-100 dark:divide-slate-800\/50/divide-\[#2C3440\]/g' $file
  sed -i -E 's/divide-slate-200 dark:divide-slate-700/divide-\[#2C3440\]/g' $file
  sed -i -E 's/divide-slate-200/divide-\[#2C3440\]/g' $file
  sed -i -E 's/divide-slate-800/divide-\[#2C3440\]/g' $file
  sed -i -E 's/dark:divide-slate-800/divide-\[#2C3440\]/g' $file

  # Text
  sed -i -E 's/text-slate-900 dark:text-\[#F8FAFC\]/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-900 dark:text-white/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-800 dark:text-slate-200/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-800 dark:text-slate-300/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-600 dark:text-slate-400/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/text-slate-500 dark:text-slate-400/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/text-slate-900/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-800/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-slate-700/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/text-slate-600/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/text-slate-500/text-\[#7C8796\]/g' $file
  sed -i -E 's/text-slate-400/text-\[#7C8796\]/g' $file
  sed -i -E 's/text-slate-300/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/text-slate-200/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/dark:text-slate-400/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/dark:text-slate-300/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/dark:text-slate-200/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/dark:text-white/text-\[#F8FAFC\]/g' $file

  # Brands
  sed -i -E 's/text-blue-600 dark:text-blue-400/text-\[#6EA0FF\]/g' $file
  sed -i -E 's/text-blue-500/text-\[#2F66F6\]/g' $file
  sed -i -E 's/text-blue-600/text-\[#2F66F6\]/g' $file
  sed -i -E 's/text-blue-400/text-\[#6EA0FF\]/g' $file
  
  sed -i -E 's/bg-blue-50 dark:bg-blue-900\/20/bg-\[#2F66F6\]\/10/g' $file
  sed -i -E 's/bg-blue-100 dark:bg-blue-900\/40/bg-\[#2F66F6\]\/20/g' $file
  sed -i -E 's/bg-blue-50/bg-\[#2F66F6\]\/10/g' $file
  sed -i -E 's/bg-blue-600/bg-\[#2F66F6\]/g' $file
  sed -i -E 's/bg-blue-500/bg-\[#2F66F6\]/g' $file
  sed -i -E 's/hover:bg-blue-600/hover:bg-\[#3B73FF\]/g' $file
  sed -i -E 's/hover:bg-blue-700/hover:bg-\[#3B73FF\]/g' $file

  sed -i -E 's/border-blue-200 dark:border-blue-800/border-\[#2F66F6\]\/30/g' $file
  sed -i -E 's/border-blue-500/border-\[#2F66F6\]/g' $file
  sed -i -E 's/border-blue-600/border-\[#2F66F6\]/g' $file
  sed -i -E 's/focus:border-blue-500/focus:border-\[#2F66F6\]/g' $file
  sed -i -E 's/focus:ring-blue-500\/20/focus:ring-\[#2F66F6\]\/15/g' $file
  sed -i -E 's/focus:ring-blue-500/focus:ring-\[#2F66F6\]\/15/g' $file
  
  # Remove extra dark: classes that might be left over
  sed -i -E 's/dark:hover:bg-\[#18212C\]/hover:bg-\[#18212C\]/g' $file
  sed -i -E 's/dark:border-\[#3A4655\]/border-\[#3A4655\]/g' $file
  sed -i -E 's/dark:text-\[#F8FAFC\]/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/dark:text-\[#A5ADBA\]/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/dark:bg-\[#151A22\]/bg-\[#151A22\]/g' $file
  sed -i -E 's/dark:bg-\[#121923\]/bg-\[#121923\]/g' $file
  
  # Fix double class duplicates like text-[#F8FAFC] text-[#F8FAFC]
  sed -i -E 's/text-\[#F8FAFC\] text-\[#F8FAFC\]/text-\[#F8FAFC\]/g' $file
  sed -i -E 's/text-\[#A5ADBA\] text-\[#A5ADBA\]/text-\[#A5ADBA\]/g' $file
  sed -i -E 's/bg-\[#121923\] bg-\[#121923\]/bg-\[#121923\]/g' $file
  sed -i -E 's/bg-\[#151A22\] bg-\[#151A22\]/bg-\[#151A22\]/g' $file
  sed -i -E 's/border-\[#2C3440\] border-\[#2C3440\]/border-\[#2C3440\]/g' $file
  sed -i -E 's/border-\[#3A4655\] border-\[#3A4655\]/border-\[#3A4655\]/g' $file
  
done
