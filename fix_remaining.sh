#!/bin/bash

file1="src/components/crm/CRMDashboardView.tsx"
sed -i -E "s/bg-slate-400/bg-\[#7C8796\]/g" $file1
sed -i -E "s/bg-\[#2C3440\] text-\[#A5ADBA\] bg-\[#18212C\] text-\[#A5ADBA\]/bg-\[#2C3440\] text-\[#A5ADBA\]/g" $file1

file2="src/components/crm/CRMBiddingNegotiationView.tsx"
sed -i -E "s/bg-\[#151A22\]0\/15 text-\[#7C8796\] border-slate-500\/30/bg-\[#151A22\] text-\[#7C8796\] border-\[#2C3440\]/g" $file2

