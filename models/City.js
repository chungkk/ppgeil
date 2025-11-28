import mongoose from 'mongoose';

const BuildingSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  placedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const CitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  gridSize: {
    type: Number,
    default: 20
  },
  buildings: [BuildingSchema],
  totalSpent: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.City || mongoose.model('City', CitySchema);
