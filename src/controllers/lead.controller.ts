import { Request, Response } from "express";
import {
    createLead,
    findLeads,
    findLeadById,
    updateLeadById,
    deleteLeadById,
} from "../services/lead.service";

export const createLeadController = async (req: Request, res: Response) => {
    try {
        const lead = await createLead(req.body);
        res.status(201).json(lead);
    } catch (error: any) {
        console.log('error', error)
        res.status(400).json({
            message: "Create lead failed",
            error: error.message,
        });
    }
};

export const getLeadsController = async (req: Request, res: Response) => {
  try {
    const leads = await findLeads();

    res.status(200).json({
      data: leads,
    });
  } catch (error) {
    console.error("getLeads error:", error);
    res.status(500).json({
      message: "Get leads failed",
    });
  }
};


export const getLeadByIdController = async (req: Request, res: Response) => {
    try {
        const lead = await findLeadById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json(lead);
    } catch (error: any) {
        res.status(400).json({
            message: "Get lead failed",
            error: error.message,
        });
    }
};

export const updateLeadController = async (req: Request, res: Response) => {
    try {
        const lead = await updateLeadById(req.params.id, req.body);

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json(lead);
    } catch (error: any) {
        res.status(400).json({
            message: "Update lead failed",
            error: error.message,
        });
    }
};

export const deleteLeadController = async (req: Request, res: Response) => {
    try {
        const lead = await deleteLeadById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json({ message: "Lead deleted" });
    } catch (error: any) {
        res.status(400).json({
            message: "Delete lead failed",
            error: error.message,
        });
    }
};
