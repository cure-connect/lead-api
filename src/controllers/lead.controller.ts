import { Response } from "express";
import {
  createLead,
  findLeads,
  findLeadById,
  updateLeadById,
  deleteLeadById,
} from "../services/lead.service";
import { AuthRequest } from "../middleware/auth.middlware";

export const createLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const branch = req.user?.branch;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const leadData = {
      ...req.body,
      clinic: {
        clinicId,
        name: clinicName || req.body.clinic?.name,
        branch: branch || req.body.clinic?.branch,
      },
    };

    const lead = await createLead(leadData);
    res.status(201).json({ data: lead });
  } catch (error: any) {
    res.status(400).json({
      message: "Create lead failed",
      error: error.message,
    });
  }
};

export const getLeadsController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const leads = await findLeads(clinicId);

    res.status(200).json({
      data: leads,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get leads failed",
    });
  }
};

export const getLeadByIdController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const lead = await findLeadById(req.params.id, clinicId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ data: lead });
  } catch (error: any) {
    res.status(400).json({
      message: "Get lead failed",
      error: error.message,
    });
  }
};

export const updateLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const leadId = req.params.id;
    const updateData = req.body;

    const updatedLead = await updateLeadById(leadId, clinicId, updateData);

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ data: updatedLead });
  } catch (error: any) {
    res.status(400).json({
      message: "Update lead failed",
      error: error.message,
    });
  }
};

export const deleteLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const lead = await deleteLeadById(req.params.id, clinicId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error: any) {
    res.status(400).json({
      message: "Delete lead failed",
      error: error.message,
    });
  }
};