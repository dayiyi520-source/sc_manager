function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('shichuang-training-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('文件存储无法打开'));
  });
}
export async function storeTrainingFile(id: string, file: Blob) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite');
    transaction.objectStore('files').put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('文件保存失败，请检查浏览器空间'));
    transaction.onabort = () => reject(new Error('文件保存已中止'));
  }); } finally { db.close(); }
}
export async function readTrainingFile(id: string) {
  const db = await database();
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id);
      request.onsuccess = () => request.result ? resolve(request.result) : reject(new Error('文件不存在，请重新上传'));
      request.onerror = () => reject(new Error('文件读取失败'));
    });
  } finally { db.close(); }
}
export async function downloadTrainingFile(id: string, name: string) {
    const url = URL.createObjectURL(await readTrainingFile(id));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function deleteTrainingFile(id: string) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite'); transaction.objectStore('files').delete(id);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(new Error('文件清理失败'));
  }); } finally { db.close(); }
}
