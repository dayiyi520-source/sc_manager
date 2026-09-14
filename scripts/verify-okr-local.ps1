param([string]$BaseUrl = 'http://127.0.0.1:8081')
$ErrorActionPreference = 'Stop'
if ($BaseUrl -ne 'http://127.0.0.1:8081') { throw 'This acceptance script is limited to the isolated OKR backend.' }
function Login($name) {
  $result = Invoke-RestMethod "$BaseUrl/api/auth/dev-login" -Method Post -ContentType 'application/json' -Body (@{username=$name} | ConvertTo-Json)
  return @{Authorization="Bearer $($result.data.token)"}
}
function Call($headers,$method,$path,$body) {
  $args = @{Uri="$BaseUrl/api/okr$path";Headers=$headers;Method=$method}
  if ($null -ne $body) {$args.ContentType='application/json';$args.Body=ConvertTo-Json -InputObject $body -Depth 15 -Compress}
  return (Invoke-RestMethod @args).data
}
$admin = Login 'admin'
$tech = Login 'tech'
$people = Call $admin Get '/people' $null
foreach ($entry in @(@{id='user-admin';supervisorId='';root=$true},@{id='user-tech';supervisorId='user-admin';root=$false})) {
  $person = $people | Where-Object id -eq $entry.id
  Call $admin Put "/people/$($entry.id)" @{supervisorId=$entry.supervisorId;root=$entry.root;version=$person.version} | Out-Null
}
$cycle = Get-Date -Format 'yyyy-MM'
$stamp = Get-Date -Format 'HHmmss'
$kr = @(@{id=[guid]::NewGuid().ToString();title='完成关键交付验收';weight=100;progress=0})
$parent = Call $admin Post '/records' @{kind='objective';periodKey=$cycle;payload=@{title="验收用组织目标 $stamp";keyResults=$kr}}
Call $admin Patch "/records/$($parent.id)" @{action='submit';version=0} | Out-Null
$child = Call $tech Post '/records' @{kind='objective';periodKey=$cycle;payload=@{title="验收用个人目标 $stamp";parentObjectiveId=$parent.id;parentKeyResultId=$kr[0].id;keyResults=$kr}}
Call $tech Patch "/records/$($child.id)" @{action='submit';version=0} | Out-Null
Call $admin Patch "/records/$($child.id)" @{action='approve';version=1} | Out-Null
$list = Call $tech Get '/records' $null
$saved = $list | Where-Object id -eq $child.id
if ($saved.status -ne 'active') {throw 'Objective approval did not persist.'}
$work = @(Call $tech Get '/work?ownerId=user-tech' $null)
if ($work.Count -eq 0) { throw 'No work evidence available.' }
$evidence = $work[-1]
$start = (Get-Date -Day 1).ToString('yyyy-MM-dd')
$end = (Get-Date -Day 1).AddMonths(1).AddDays(-1).ToString('yyyy-MM-dd')
$reviewPayload = @{title="验收用计划外工作复盘 $stamp";startDate=$start;endDate=$end;summary='基于任务交付核对月度结果';items=@(@{workId=$evidence.id;result='完成临时支持交付';impact='临时支持占用两天，影响原定交付';affectedObjectiveId=$child.id;affectedKeyResultId=$kr[0].id})}
$review = Call $tech Post '/records' @{kind='review';periodKey="$start/$end";payload=$reviewPayload}
Call $tech Patch "/records/$($review.id)" @{action='submit';version=0} | Out-Null
Call $admin Patch "/records/$($review.id)" @{action='return';version=1;feedback='请补充交付结果'} | Out-Null
$reviewPayload.items[0].result = '补充交付结果：完成临时支持并确认验收'
Call $tech Patch "/records/$($review.id)" @{action='save';version=2;payload=$reviewPayload} | Out-Null
Call $tech Patch "/records/$($review.id)" @{action='submit';version=3} | Out-Null
Call $admin Patch "/records/$($review.id)" @{action='approve';version=4;feedback='交付证据已核实';finalScore=88;evaluation='认可临时贡献，延期原因明确';includedWorkIds=@($evidence.id)} | Out-Null
$confirmed = @(Call $tech Get '/records' $null) | Where-Object id -eq $review.id
$snapshot = $confirmed.payload | ConvertFrom-Json
if ($confirmed.status -ne 'reviewed' -or $snapshot.finalScore -ne 88 -or !$snapshot.items[0].included -or $snapshot.items[0].affectedObjectiveId -ne $child.id) {throw 'Review approval or impact evidence did not persist.'}
Write-Output "OKR API acceptance passed: alignment, approval, return/edit/resubmit, contribution inclusion, score and impact persistence. Work candidates: $($work.Count)."
Write-Output "Acceptance records: $($parent.id), $($child.id)"
