import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Empty } from 'antd';
import { readTrainingFile, downloadTrainingFile } from '../../services/trainingFiles';
import type { TrainingLesson } from '../../services/trainingRepository';

export function TrainingLessonMedia({ lesson, watchedSeconds = 0, onWatch }: { lesson?: TrainingLesson; watchedSeconds?: number; onWatch?: (videoId: string, seconds: number) => void }) {
  const { message } = App.useApp();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const video = lesson?.videos?.find(video => video.active);
  const videoId = video?.id;
  const watched = useRef(watchedSeconds); const clock = useRef(0); const position = useRef(watchedSeconds); const sent = useRef(Math.floor(watchedSeconds));
  useEffect(() => {
    let disposed = false; let objectUrl = '';
    setUrl(''); setError(''); watched.current = watchedSeconds; position.current = watchedSeconds; sent.current = Math.floor(watchedSeconds); clock.current = 0;
    if (videoId) readTrainingFile(videoId).then(blob => { if (!disposed) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(cause => { if (!disposed) setError(cause.message); });
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [videoId]);
  return <>{error ? <Alert type="error" title={error} /> : url ? <video className="training-lesson-video" src={url} controls preload="metadata" onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(watched.current, event.currentTarget.duration); }} onPlay={event => { clock.current = performance.now(); position.current = event.currentTarget.currentTime; }} onSeeking={event => { if (onWatch && event.currentTarget.currentTime > watched.current + .5) event.currentTarget.currentTime = watched.current; position.current = event.currentTarget.currentTime; clock.current = performance.now(); }} onTimeUpdate={event => {
      const player = event.currentTarget; const now = performance.now(); const delta = player.currentTime - position.current; const elapsed = (now - clock.current) / 1000;
      if (onWatch && !player.paused && !player.seeking && !document.hidden && clock.current && delta > 0 && delta <= Math.min(2, elapsed * 1.25 + .1)) {
        watched.current = Math.min(video?.duration || player.duration, Math.max(watched.current, player.currentTime));
        if (Math.floor(watched.current) > sent.current && videoId) { sent.current = Math.floor(watched.current); onWatch(videoId, watched.current); }
      }
      position.current = player.currentTime; clock.current = now;
    }} onEnded={() => { if (onWatch && videoId && video && watched.current >= video.duration - 1) { watched.current = video.duration; onWatch(videoId, video.duration); } }} /> : <div className="training-video-empty"><Empty description={videoId ? '正在加载视频' : '课程视频待配置'} /></div>}{lesson?.files?.length ? <div><h3>课程资料</h3>{lesson.files.map(file => <Button key={file.id} type="link" onClick={() => downloadTrainingFile(file.id, file.name).catch(cause => message.error(cause.message))}>{file.name}</Button>)}</div> : null}</>;
}
