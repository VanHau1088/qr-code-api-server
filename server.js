import express, { json } from 'express';
import mongoose, { connect} from 'mongoose';
import { generate } from 'shortid';
import authRouter from './routes/authRoute.js'
import QR from './models/qrModel.js'
import cors from 'cors';
import axios from 'axios';
const app = express();
const PORT =  3000;

import auth from './middleware/auth.js'; // Middleware để xác thực người dùng
import qrRoutes from './routes/qrRoutes.js'; // Đảm bảo nhập đúng route
import { UAParser } from 'ua-parser-js';
import dotenv from 'dotenv'
// 1) MIDDLEWARESimport express, { json } from 'express';
app.use(cors());
app.use(express.json());
// Kết nối đến MongoDB
app.use('/api', qrRoutes); // Đảm bảo sử dụng đúng route

// Kết nối đến MongoDB
// mongoose.set('strictQuery', false); // Hoặc true nếu bạn muốn giữ strictQuery
// connect('mongodb://127.0.0.1:27017/qrDynamic', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => console.log('Connected to MongoDB')).catch((error) => console.error('Error connecting to MongoDB:', error));

dotenv.config()

mongoose.set('strictQuery', false); // Hoặc true nếu bạn muốn giữ strictQuery
connect('mongodb+srv://root:123@cluster0.td1md.mongodb.net/qrs?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB')).catch((error) => console.error('Error connecting to MongoDB:', error));


// connect('mongodb://localhost:27017/qrDynamic');
app.use(json());

// Thiết lập CORS
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'https://vanhau1088.github.io, https://qr-code-generator-app-lovat.vercel.app'];
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 4) GLOBAL ERRORS HANDLER
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  err.statuCode = err.statuCode || 500;
  err.status = err.status || 'error';
     
  res.status(err.statuCode).json({
    status: err.status,
    message: err.message,
  });
});
// 2) ROUTES 
app.use('/api/auth', authRouter);
//Sử dụng route cho API 
app.use(express.json());

app.post('/shorten', auth, async (req, res) => {
  const {type, data, name, project, qrImage, maxScans, expirationDate} = req.body;
  const userId = req.user._id; // Lấy userId từ thông tin xác thực người dùng
  // const qrImage = req.body.qrImage;
  console.log('Received type:', type);
  console.log('Received data:', data);
  console.log('Received userId:', userId);
  console.log('Received name:', name);
  console.log('Received project:', project);
  console.log('Received maxScans:', maxScans);
  const shortUrl = generate();
  const newQR = new QR({ 
    type, 
    data, 
    shortUrl, 
    userId, 
    qrImage, 
    name, 
    createdAt: new Date(),
    isActive: true,
    shortUrlOriginal: shortUrl, // Lưu URL gốc
    scanCount: 0,
    scanIps: [String],
    scanLocations: [Object], // Lưu trữ thông tin vị trí địa lý
    scans:[],
    project: project || "Không có dự án",
    maxScans,
    expirationDate: expirationDate ? new Date(expirationDate) : null
   }); // Thêm userId vào mã QR
 
  try {
    await newQR.save();
    res.json({ shortUrl });
  } catch (error) {
    console.error('Error saving QR code:', error);
    res.status(500).json({ error: 'Failed to save QR code' });
  }
});

app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const parser = new UAParser(); 
  const ua = req.headers['user-agent']; 
  const result = parser.setUA(ua).getResult();
  // const ua = UAParser(req.headers['user-agent']);
  // const result = ua.getResult();
  try {
    const ipRes = await axios.get('https://ipinfo.io/json');
    const ip = ipRes.data.ip; 
    console.log(`Recieved request for short URL: ${shortUrl} from IP: ${ipRes}`);
    const qr = await QR.findOne({ shortUrl });
    if (qr) {
     
      // Kiểm tra ngày hết hạn
      if (qr.expirationDate && new Date() > new Date(qr.expirationDate)) {
         return res.status(403).send('Mã QR này đã hết hạn sử dụng'); 
      }
     
      // Kiểm tra Số lượng giới hạng quét
      if (qr.scanCount >= qr.maxScans) { 
        return res.status(403).send('Mã QR này đã đạt giới hạn số lượt quét'); 
      }
      console.log(`Found QR data: ${JSON.stringify(qr)}`);
      // Tăng số lần quét
      console.log("Số lần quét:", qr.scanCount += 1);
  
      // Lưu địa chỉ IP
      qr.scanIps = qr.scanIps || [];
      qr.scanIps.push(ip);
  
      // Lưu thông tin thiết bị
          const scanData = { 
              device: result.device.type || 'Không xác định được thiết bị', 
              browser: result.browser.name || 'Không xác định được thiết bị',
              os: result.os.name || 'Không xác định được thiết bị'
          }; 
          qr.scans.push(scanData);
  
          try {
              // Gọi API ipinfo để lấy thông tin vị trí địa lý
              // const locationRes = await axios.get(`https://ipapi.co/city`);

              const locationRes = await axios.get(`https://ipinfo.io/${ip}/json`);

              const location = locationRes.data;
              console.log('Thông tin vị trí: ', location);
              
              const locationData = {
                city: location.city || 'Không xác định được vị trí',
                country: location.country || 'Không xác định được vị trí' //Lấy Country
              };

              console.log('Thông tin vị trí: ', locationData.city);
              // Lưu thông tin vị trí vào cơ sở dữ liệu
              qr.scanLocations = qr.scanLocations || [];
              qr.scanLocations.push({ location: locationData });
              
          } catch (error) {
              console.error(`Failed to fetch location data for IP: ${ip}`, error);
          }
          await qr.save();
          console.log('QR data saved successfully');
          
      switch (qr.type) {
        case 'url':
          {
            res.redirect(qr.data.url); 
            break;
          }
        case 'text':
          {
            await qr.save();
            const textUrl = `https://vanhau1088.github.io/myqrcode.github.io?text=${encodeURIComponent(qr.data.text)}`;
            res.redirect(textUrl);
          break;
          }
        case 'wifi':
          {
            const wifiUrl = `https://vanhau1088.github.io/wifi.github.io?ssid=${encodeURIComponent(qr.data.ssid)}&networkType=${encodeURIComponent(qr.data.networkType)}&password=${encodeURIComponent(qr.data.password)}`;
            res.redirect(wifiUrl);
          break;
          }
        case 'card':
          {
            const cardUrl = `https://vanhau1088.github.io/vcard.github.io?fullName=${encodeURIComponent(qr.data.fullName)}&phoneNumber=${encodeURIComponent(qr.data.phoneNumber)}&email=${encodeURIComponent(qr.data.email)}&address=${encodeURIComponent(qr.data.address)}&website=${encodeURIComponent(qr.data.website)}&job=${encodeURIComponent(qr.data.job)}`;
            res.redirect(cardUrl);
          break;
          }
        case 'event':
          {
            const eventUrl = `https://vanhau1088.github.io/Event.github.io?title=${encodeURIComponent(qr.data.title)}&eventName=${encodeURIComponent(qr.data.eventName)}&startDate=${encodeURIComponent(qr.data.startDate)}&endDate=${encodeURIComponent(qr.data.endDate)}&about=${encodeURIComponent(qr.data.about)}&address=${encodeURIComponent(qr.data.address)}&contactName=${encodeURIComponent(qr.data.contactName)}&phoneNumber=${encodeURIComponent(qr.data.phoneNumber)}&email=${encodeURIComponent(qr.data.email)}&website=${encodeURIComponent(qr.data.website)}`;
            res.redirect(eventUrl);
          break;
          }
        case 'email':
          {
            console.log(`Email Data: ${qr.data.email}, Subject: ${qr.data.subject}, Message: ${qr.data.message}`);
            const emailUrl = `mailto:${qr.data.email}?subject=${encodeURIComponent(qr.data.subject)}&body=${encodeURIComponent(qr.data.message)}`; 
            res.redirect(emailUrl);
            break;
          }
        case 'sms':
          {
            // const smsUrl = `SMSTO:${qr.data.formattedNumber}:${encodeURIComponent(qr.data.message)}`;
            const smsUrl = `sms:${qr.data.formattedNumber}?body=${encodeURIComponent(qr.data.message)}`;
            console.log(`Redirecting to SMS URL: ${smsUrl}`); 
            res.redirect(smsUrl);
            break;
          }
        case 'geo':
          {
            // const geoUrl = `geo:${qr.data.latitude},${qr.data.longitude}`;
            const geoUrl = `https://www.google.com/maps/search/?api=1&query=${qr.data.latitude},${qr.data.longitude}`
            console.log(`Redirecting to Location URL: ${geoUrl}`); 
            res.redirect(geoUrl);
            break;
          }
          case 'payment': 
          {
            if(qr.data.content) {
              const paymentUrl = `https://vietqr.net/?data=${qr.data.content}`;
              console.log(`QR Content: ${qr.data.content}`); 
              res.redirect(paymentUrl); // Chuyển hướng đến URL thanh toán
            }
            else { 
              res.status(400).json({ error: 'Missing or incorrect QR code content' }); 
            }
              break;
          }
          default:
          console.log('Unknown QR type:', qr.type);
          res.status(400).json({ error: 'Unknown QR type' });
          break;
      }
    } else {
      console.log('No data found for shortUrl:', shortUrl);
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (error) {
    console.error('Error fetching QR data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.patch('/api/set-max-scans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { maxScans } = req.body;
    const qr = await QR.findByIdAndUpdate(id, { maxScans }, { new: true });
    res.status(200).json(qr);
  } catch (error) {
    console.error('Failed to set max scans', error);
    res.status(500).send('Đã xảy ra lỗi');
  }
});

app.patch('/api/set-expiration-date/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { expirationDate } = req.body;
    const qr = await QR.findByIdAndUpdate(id, { expirationDate }, { new: true });
    res.status(200).json(qr);
  } catch (error) {
    console.error('Failed to set expiration date', error);
    res.status(500).send('Đã xảy ra lỗi');
  }
});

app.post('/update-url', async (req, res) => {
  const { shortUrl, newUrl } = req.body;
  console.log('Received shortUrl:', shortUrl);  // Log shortUrl nhận được
  console.log('Received newUrl:', newUrl);  // Log newUrl nhận được
  const qr = await QR.findOne({ shortUrl });

  if (qr) {
    qr.data = { url: newUrl }; // Cập nhật URL mới
    await qr.save();
    res.json({ message: 'Data updated successfully' });
  } else {
    res.status(404).json({ error: 'Data not found' });
  }
});

app.post('/update-text', async (req, res) => {
  const { shortUrl, newText } = req.body;
  console.log('Received shortUrl:', shortUrl);  // Log shortUrl nhận được
  console.log('Received newText:', newText);  // Log newText nhận được
  const qr = await QR.findOne({ shortUrl });

  if (qr) {
    qr.data = { text: newText }; // Cập nhật văn bản mới
    await qr.save();
    res.json({ message: 'Text updated successfully' });
  } else {
    res.status(404).json({ error: 'Data not found' });
  }
});

app.post('/update-wifi', async (req, res) => {
  const { shortUrl, ssid, networkType, password } = req.body;
  console.log('Received shortUrl:', shortUrl);  // Log shortUrl nhận được
  console.log('Received ssid:', ssid);  // Log ssid nhận được
  console.log('Received networkType:', networkType);  // Log networkType nhận được
  console.log('Received password:', password);  // Log password nhận được
    const qr = await QR.findOne({ shortUrl });
    if (qr) {
      qr.data = {ssid: ssid, networkType: networkType, password: password}
      await qr.save();
      res.status(200).json({ message: 'WiFi Info updated successfully' });
     }
     else {
      res.status(404).json({ error: 'Data not found' });
     }
    });

app.post('/update-card', async (req, res) => {
    const { shortUrl, fullName, phoneNumber, email, address, website, job } = req.body;
    console.log('Received shortUrl:', shortUrl);  // Log shortUrl nhận được
    console.log('Received fullName:', fullName);  // Log fullName nhận được
    console.log('Received phoneNumber:', phoneNumber);  // Log phoneNumber nhận được
    console.log('Received email:', email);  // Log email nhận được
    console.log('Received address:', address);  // Log address nhận được
    console.log('Received website:', website);  // Log website nhận được
    console.log('Received job:', job);  // Log job nhận được
      const qr = await QR.findOne({ shortUrl });
        if (qr) {
          qr.data = {fullName: fullName, phoneNumber: phoneNumber, email: email, address: address, website: website, job: job}
          await qr.save();
          res.status(200).json({ message: 'Card Info updated successfully' });
         }
         else {
          res.status(404).json({ error: 'Data not found' });
         }
    });

app.post('/update-event', async (req, res) => {
      const { shortUrl, title, eventName, startDate, endDate, about, address, contactName, phoneNumber, email, website} = req.body;
      console.log('Received shortUrl:', shortUrl);  // Log shortUrl nhận được
      console.log('Received title:', title);  // Log title nhận được
      console.log('Received eventName:', eventName);  // Log eventName nhận được
      console.log('Received startDate:', startDate);  // Log startDate nhận được
      console.log('Received endDate:', endDate);  // Log endDate nhận được
      console.log('Received about:', about);  // Log about nhận được
      console.log('Received address:', address);  // Log address nhận được
      console.log('Received contactName:', contactName);  // Log contactName nhận được
      console.log('Received phoneNumber:', phoneNumber);  // Log phoneNumber nhận được
      console.log('Received email:', email);  // Log email nhận được
      console.log('Received website:', website);  // Log website nhận được
        const qr = await QR.findOne({ shortUrl });
          if (qr) {
            qr.data = {title: title, eventName: eventName, startDate: startDate, endDate: endDate, about: about, address: address, contactName: contactName, phoneNumber: phoneNumber, email: email, website: website}
            await qr.save();
            res.status(200).json({ message: 'Event Info updated successfully' });
           }
           else {
            res.status(404).json({ error: 'Data not found' });
           }
      });



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
