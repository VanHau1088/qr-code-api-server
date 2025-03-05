import QR from '../models/qrModel.js';

export const getUserQRCodes = async (req, res) => {
  try {
    const qrs = await QR.find({ userId: req.user._id });
    res.status(200).json(qrs);
  } catch (error) {
    console.error('Error getting QR codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveQRCode = async (req, res) => {
  const { type, data, userId, qrImage, name, project, maxScans, expirationDate } = req.body;
  if (!type || !data || !userId || !qrImage) {
    return res.status(400).json({ error: 'Data not found' });
  }
  const shortUrl = `https://qr-code-generate-backend.onrender.com/${Math.random().toString(36).substring(7)}`;
  console.log('Received type:', type); 
  console.log('Received data:', data); 
  console.log('Received userId:', userId); 
  console.log('Received name:', name); 
  console.log('Received project:', project); 
  console.log('Generated shortUrl:', shortUrl);
  const newQR = new QR({ 
    type, 
    data, 
    shortUrl, 
    userId, 
    qrImage, 
    name, 
    createdAt: new Date(),
    shortUrlOriginal: shortUrl, // Lưu URL gốc
    isActive: true,
    scanCount: 0,
    scanIps: [String],
    scanLocations: [Object], // Lưu trữ thông tin vị trí địa lý
    scans:[],
    project: project || "Không có dự án",
    maxScans,
    expirationDate,
  }); 

  try {
    await newQR.save();
    res.status(200).json({ shortUrl });
  } catch (error) {
    console.error('Error saving QR code:', error);
    res.status(500).json({ error: 'Failed to save QR code' });
  }
};



export const deleteQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    const qrCode = await QR.findByIdAndDelete(id);
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    res.status(200).json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
};


export const deleteQRStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const qrCode = await QR.findById(id);
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    // Xóa QR Code
    await qrCode.remove();
    
    res.json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Error deleting QR code status:', error);
    res.status(500).json({ error: 'Failed to delete QR code status' });
  }
};

export const toggleQRCodeStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const qrCode = await QR.findById(id);
    if (!qrCode) {
      // return res.status(404).json({ error: 'QR code not found' });
      return res.status(403).send('Mã QR này đã đạt giới hạn số lượt quét');  

    }

    if (qrCode.isActive) {
      qrCode.isActive = false;
      qrCode.shortUrl = 'https://503b-2001-ee0-4f8c-92c0-d1a1-1519-84f-2120.ngrok-free.app/qr-disabled'; // Đổi shortUrl thành giá trị tạm thời
    } else {
      qrCode.isActive = true;
      qrCode.shortUrl = qrCode.shortUrlOriginal; // Khôi phục lại URL gốc
    }

    await qrCode.save();
    res.status(200).json({ message: 'QR code status updated successfully', isActive: qrCode.isActive });
  } catch (error) {
    console.error('Error updating QR code status:', error);
    res.status(500).json({ error: 'Failed to update QR code status' });
  }
};
