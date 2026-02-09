import { Request, Response } from "express";
import {
    getAllChannel,
    getChannelById,
    editChannelName,
    deleteChannelById
} from '../services/setting.service';

export const getAllChannelController = async (req: Request, res: Response) => {
  try {
    const result = await getAllChannel();
    return res.status(200).json({ data: result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getChannelByIdController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'id must be a number' });
    }

    const result = await getChannelById(id);

    if (!result) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    return res.status(200).json({ data: result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const editChannelController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ message: 'id must be a number' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required' });
    }

    const result = await editChannelName(id, name);

    if (!result) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    return res.status(200).json({ data: result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteChannelController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'id must be a number' });
    }

    const result = await deleteChannelById(id);

    if (!result) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    return res.status(200).json({
      message: 'Channel deleted successfully',
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
