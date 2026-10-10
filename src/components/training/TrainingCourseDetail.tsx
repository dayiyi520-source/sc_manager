import { Button, Progress, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { learningLessons, stageLessons, trainingStages, type TrainingCourse, type TrainingState } from '../../services/trainingRepository';
import { SystemMaterialActions } from './TrainingSystemMaterials';
import { statusColors } from './TrainingRecords';

export const trainingTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function TrainingCourseDetail({ course, state, enterLesson, onBack }: { course: TrainingCourse; state: TrainingState; enterLesson: (courseId: string, lessonId: string) => void; onBack: () => void }) {
  const stages = trainingStages(course).filter(stage => stage.enabled).sort((a, b) => a.sort - b.sort);
  const lessons = learningLessons(course);
  const completed = (ids: string[]) => state.records.filter(record => record.courseId === course.id && ids.includes(record.lessonId) && record.status === '已完成').length;
  const count = completed(lessons.map(lesson => lesson.id));
  return <section className="training-course-detail"><header className="training-detail-hero">{course.cover && <img src={course.cover} alt="" />}<div className="training-hero-content"><Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>返回我的课程</Button><h1>{course.title}</h1><p>{course.description}</p><div className="training-hero-bottom"><div className="training-hero-stats">{[[stages.length, '阶段'], [lessons.length, '课程'], [count, '已完成'], [`${lessons.length ? Math.round(count / lessons.length * 100) : 0}%`, '总进度']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="training-header-actions"><SystemMaterialActions course={course} /></div></div></div></header><div className="training-detail-stages">{stages.map((stage, index) => {
    const items = stageLessons(course, stage).filter(lesson => lesson.enabled !== false); const done = completed(items.map(lesson => lesson.id));
    return <article className="training-detail-stage" key={stage.id}><header><span className="training-stage-number">{String(index + 1).padStart(2, '0')}</span><div><h2>{stage.title}</h2><Tag color={stage.sequential ? 'warning' : 'default'}>{stage.sequential ? '顺序学习' : '自由学习'}</Tag><span className="training-muted">{done}/{items.length} 已完成</span></div><Progress percent={items.length ? Math.round(done / items.length * 100) : 0} size="small" /></header>{items.map((lesson, lessonIndex) => {
      const record = state.records.find(item => item.courseId === course.id && item.lessonId === lesson.id); const status = record?.status || '未开始'; const video = lesson.videos?.find(item => item.active);
      const locked = stage.sequential && items.slice(0, lessonIndex).some(item => !state.records.some(record => record.courseId === course.id && record.lessonId === item.id && record.status === '已完成'));
      return <div className="training-detail-lesson" key={lesson.id}><span className="training-lesson-number">{lessonIndex + 1}</span><div><h3>{lesson.title}</h3><p className="training-muted">{video ? `V${video.version} · ${trainingTime(video.duration)}` : '视频待配置'}</p></div><Tag color={statusColors[status]}>{status}</Tag><Button type="link" disabled={locked} title={locked ? '请先完成前面的课程' : undefined} onClick={() => enterLesson(course.id, lesson.id)}>{locked ? '待解锁' : status === '学习中' ? '继续学习' : status === '已完成' ? '复习' : '开始学习'}</Button></div>;
    })}</article>;
  })}</div></section>;
}
