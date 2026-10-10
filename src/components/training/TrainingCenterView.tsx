import { useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Input, Spin, Tabs } from 'antd';
import { ArrowRightOutlined, BookOutlined, CheckCircleOutlined, DashboardOutlined, EditOutlined, FileTextOutlined, PlayCircleOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { loadTraining, saveTraining, trainingSummary, updateLearning, recordTrainingWatch, type TrainingCourse, type TrainingState } from '../../services/trainingRepository';
import { LearningProgress, TrainingLedger, TrainingOverview, TrainingWarnings } from './TrainingRecords';
import { TrainingExams } from './TrainingExams';
import { TrainingConfig } from './TrainingConfig';
import './training.css';
import { TrainingCourseDetail } from './TrainingCourseDetail';
import { TrainingLearningPage } from './TrainingLearningPage';

type Section = 'overview' | 'config' | 'ledger' | 'alerts' | 'exams';
type LearningSection = 'courses' | 'progress' | 'exams';

export function TrainingCenterView() {
  return <App><TrainingWorkspace /></App>;
}

function TrainingWorkspace() {
  const { currentUser } = useApp();
  const { activeTabId } = useAppNavigation();
  const { message } = App.useApp();
  const [state, setState] = useState<TrainingState>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [learningSection, setLearningSection] = useState<LearningSection>('courses');
  const [ledgerStatus, setLedgerStatus] = useState('all');
  const [detailCourseId, setDetailCourseId] = useState<string>();
  const [selected, setSelected] = useState<{ courseId: string; lessonId: string }>();
  const home = activeTabId === 'training_home' || activeTabId === 'training_courses';
  const admin = activeTabId === 'training_admin';
  const canManage = currentUser.role === 'admin';

  const reload = () => {
    try { setState(loadTraining(currentUser.id)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '培训数据加载失败'); }
  };
  useEffect(reload, [currentUser.id]);
  const commit = (next: TrainingState) => {
    try { saveTraining(currentUser.id, next); setState(next); return true; }
    catch { message.error('保存失败，浏览器存储不可用，请重试'); return false; }
  };
  if (error) return <Alert type="error" showIcon title="培训数据加载失败" description={error} action={<Button onClick={reload}>重试</Button>} />;
  if (!state) return <Spin />;
  if (admin && !canManage) return <Empty description="仅管理员可访问培训管理" />;
  const summary = trainingSummary(state);
  const visibleCourses = summary.courses.filter(course => `${course.title}${course.description}`.includes(query));
  const current = summary.courses.find(course => course.id === selected?.courseId);
  const lesson = current?.lessons.find(item => item.id === selected?.lessonId);
  const resume = [...summary.records].filter(item => item.record?.status === '学习中' || item.record?.status === '需重学')
    .sort((a, b) => (b.record?.updatedAt || '').localeCompare(a.record?.updatedAt || ''))[0];
  const enterLesson = (courseId: string, lessonId: string) => {
    try { if (commit(updateLearning(state, courseId, lessonId, '学习中'))) setSelected({ courseId, lessonId }); }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '课程无法打开'); }
  };
  const enterCourse = (course: TrainingCourse) => { setSelected(undefined); setDetailCourseId(course.id); };
  const courseGrid = <div className={`training-grid ${home ? 'training-home-grid' : ''}`}>
    {visibleCourses.map(course => <article className="training-course" key={course.id}>
      <button className="training-cover" aria-label={`学习${course.title}`} onClick={() => enterCourse(course)}>{course.cover ? <img src={course.cover} alt={course.title} /> : <span className="training-cover-placeholder"><BookOutlined /></span>}<span className="training-cover-play"><PlayCircleOutlined /></span></button>
      <div className="training-course-body"><h3 title={course.title}>{course.title}</h3><p>{course.description}</p><div className="training-course-footer"><Button type="link" onClick={() => enterCourse(course)}>进入学习 <ArrowRightOutlined /></Button><span>{course.lessons.length} 门课程</span></div></div>
    </article>)}
    {!visibleCourses.length && <Empty description="暂无匹配课程" />}
  </div>;
  const toolbar = <div className="training-toolbar"><Input.Search placeholder="搜索课程或业务系统" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 280, maxWidth: '100%' }} /></div>;
  const person = { id: currentUser.id, name: currentUser.name, account: currentUser.username, department: currentUser.department };
  if (current && lesson) return <div className="training-page"><TrainingLearningPage lesson={lesson} record={state.records.find(record => record.courseId === current.id && record.lessonId === lesson.id)} onBack={() => { setDetailCourseId(current.id); setSelected(undefined); }} onWatch={(videoId, seconds) => { try { commit(recordTrainingWatch(state, current.id, lesson.id, videoId, seconds)); } catch (cause) { message.error(cause instanceof Error ? cause.message : '学习进度保存失败'); } }} /></div>;
  const detailCourse = summary.courses.find(course => course.id === detailCourseId);
  if (detailCourse) return <div className="training-page"><TrainingCourseDetail course={detailCourse} state={state} enterLesson={enterLesson} onBack={() => setDetailCourseId(undefined)} /></div>;
  return <div className="training-page">
    {home ? <>
      {resume && <section className="training-resume"><div><span>继续上次学习</span><h2>{resume.course.title} · {resume.lesson.title}</h2><p>{resume.record?.status} · {resume.lesson.stage}</p></div><Button type="primary" icon={<PlayCircleOutlined />} onClick={() => enterLesson(resume.course.id, resume.lesson.id)}>继续学习</Button></section>}
      <div className="training-section-heading"><div><h2>培训课程</h2><p>选择业务系统，进入阶段课程与配套资料</p></div><span>共 {summary.courses.length} 个系统</span></div>{courseGrid}
    </> : admin ? <div className="training-workspace"><Tabs className="training-category-tabs" activeKey={section} onChange={key => { setSection(key as Section); setLedgerStatus('all'); setQuery(''); }} items={[
      { key: 'overview', label: '数据概览', icon: <DashboardOutlined /> }, { key: 'config', label: '培训配置', icon: <SettingOutlined /> }, { key: 'ledger', label: '学习台账', icon: <FileTextOutlined /> }, { key: 'alerts', label: '异常警告', icon: <WarningOutlined /> }, { key: 'exams', label: '考核管理', icon: <EditOutlined /> }
    ]} /><div className="training-workspace-content">
      {section === 'overview' ? <TrainingOverview state={state} person={person} navigate={(next, status = 'all') => { setLedgerStatus(status); setSection(next); }} />
      : section === 'config' ? <TrainingConfig state={state} commit={commit} /> : section === 'ledger' ? <TrainingLedger state={state} person={person} commit={commit} initialStatus={ledgerStatus} /> : section === 'alerts' ? <TrainingWarnings state={state} person={person} commit={commit} /> : <TrainingExams state={state} person={person} commit={commit} management />}
    </div></div> : <div className="training-workspace"><Tabs className="training-category-tabs" activeKey={learningSection} onChange={key => { setLearningSection(key as LearningSection); setQuery(''); }} items={[
      { key: 'courses', label: '我的课程', icon: <BookOutlined /> }, { key: 'progress', label: '我的进度', icon: <CheckCircleOutlined /> }, { key: 'exams', label: '我的考核', icon: <EditOutlined /> }
    ]} /><div className="training-workspace-content">{learningSection === 'progress' ? <LearningProgress state={state} enterLesson={enterLesson} /> : learningSection === 'exams' ? <TrainingExams state={state} person={person} commit={commit} /> : <>{toolbar}{courseGrid}</>}</div></div>}


  </div>;
}
