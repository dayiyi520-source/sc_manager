import { Button, Progress, Tag } from 'antd';
import type { LearningRecord, TrainingLesson } from '../../services/trainingRepository';
import { TrainingLessonMedia } from './TrainingLessonMedia';
import { statusColors } from './TrainingRecords';
import { trainingTime } from './TrainingCourseDetail';

export function TrainingLearningPage({ lesson, record, onBack, onWatch }: { lesson: TrainingLesson; record?: LearningRecord; onBack: () => void; onWatch: (videoId: string, seconds: number) => void }) {
  const video = lesson.videos?.find(item => item.active);
  const seconds = record?.videoId === video?.id ? record?.watchedSeconds ?? 0 : 0;
  const percent = video?.duration ? Math.min(100, Math.floor(seconds / video.duration * 100)) : 0;
  return <section className="training-learning-page"><header><h2>{lesson.title}</h2><Button onClick={onBack}>返回</Button></header><div className="training-player-layout"><main><TrainingLessonMedia lesson={lesson} watchedSeconds={seconds} onWatch={onWatch} /></main><aside><section><h3>学习说明</h3><p>{lesson.content || '暂无'}</p></section><section><h3>达标要求</h3><p>{lesson.requirements || '暂无'}</p></section><section><h3>视频信息</h3><dl><dt>版本</dt><dd>{video ? `V${video.version}` : '未配置'}</dd><dt>时长</dt><dd>{video ? trainingTime(video.duration) : '—'}</dd><dt>状态</dt><dd><Tag color={statusColors[record?.status || '未开始']}>{record?.status || '未开始'}</Tag></dd><dt>已学习时长</dt><dd className="training-index-hint">{trainingTime(seconds)}</dd></dl></section><section><h3>有效学时进度</h3><Progress percent={percent} /><p className="training-muted">按实际观看累计进度，前跳不增加学时。此进度为本地演示记录，不计正式培训结果。</p></section></aside></div></section>;
}
