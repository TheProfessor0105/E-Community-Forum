import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'db3lqjexy',
  api_key: '165492762621545',
  api_secret: 'VbEi_IJQTR8kUmaG2NBkcjfDsl0'
});

export default cloudinary; 