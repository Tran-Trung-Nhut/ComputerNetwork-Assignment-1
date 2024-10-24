import portscanner from 'portscanner';
import { exec } from 'child_process';
import open from 'open';


const FRONTEND_PORT = 3000;
const FRONTEND_START_COMMAND = 'npm start --prefix frontend';
const BACKEND_START_COMMAND = 'ts-node backend/src/client/client.ts';

// Hàm kiểm tra xem cổng 3000 có mở không
portscanner.checkPortStatus(FRONTEND_PORT, '127.0.0.1', (error: Error | null, status: string) => {
  if (status === 'open') {
    // Nếu cổng 3000 đã mở, chỉ cần mở một tab mới trên trình duyệt
    open(`http://localhost:${FRONTEND_PORT}`);
  } else {
    // Nếu cổng 3000 chưa mở, khởi động frontend
    exec(FRONTEND_START_COMMAND, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error starting frontend: ${err.message}`);
        return;
      }
    });
  }
});

// Luôn khởi động backend
let backend = exec(BACKEND_START_COMMAND, (err, stdout, stderr) => {
  if (err) {
    return;
  }
});

// app.post('/shutdown', (req: Request, res: Response) => {
//   if (backend) {
//     backend.kill();  // Dừng tiến trình backend

//     exec('exit')
//   }
//   res.sendStatus(200);
// });

// app.listen(9999, () => {});
