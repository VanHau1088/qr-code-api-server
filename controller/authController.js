import User from '../models/userModel.js';
// import createError from '../utils/appError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// REGISTER USER
export const signup = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        // if (user) {
        //     return next(new createError('User already exists', 400));
        // }

        if (user) {
            return res.status(404).json({ 
               status: 'fail', 
               message: 'User exists!', 
           });
       }

        // Truyền đúng các đối số cho bcrypt.hash
        const hashedPassword = await bcrypt.hash(req.body.password, 12); // Sử dụng 12 rounds cho salt

        const newUser = await User.create({
            ...req.body,
            password: hashedPassword,
        });

        // Assign JWT (Json Web Token) to User
        const token = jwt.sign({ id: newUser._id }, 'secretkey123', {
            expiresIn: '90d',
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            }
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try{
        const {email, password} = req.body;
        
        const user = await User.findOne({ email });
   
        // if(!user)
        //      return next(new createError("User not found!", 404));

        if (!user) {
             return res.status(404).json({ 
                status: 'fail', 
                message: 'User not found!', 
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        // if(!isPasswordValid){ 
        //     return next(new createError("Incorrect email or password!", 401));
        // }

        if (!isPasswordValid) {
            return res.status(404).json({ 
               status: 'fail', 
               message: 'Incorrect email or password!', 
           });
       }

        const token = jwt.sign({ id: user._id }, 'secretkey123', {
            expiresIn: '90d',
        });
        res.status(200).json({
            status: 'success',
            token,
            message: 'logged in successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        })
    }catch (error) {
        next(error);
    }
};

const authController = {signup, login};
export default authController;
// LOGIN USER

