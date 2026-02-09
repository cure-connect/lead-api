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

    let body: any;

    if (req.file) {
      body = JSON.parse(req.body.data || "{}");
    } else {
      body = req.body;
    }

    let deposit: { amount: number; slipUrl: string } | undefined;

    if (req.file && body.depositAmount) {
      const slipUrl = `/uploads/slips/${req.file.filename}`;
      deposit = {
        amount: Number(body.depositAmount),
        slipUrl,
      };
    }

    const leadData = {
      ...body,
      clinic: {
        clinicId,
        name: clinicName || body.clinic?.name,
        branch: branch || body.clinic?.branch,
      },
      ...(deposit ? { deposit } : {}),
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

    // รองรับทั้ง multipart/form-data และ JSON
    let updateData: any;

    if (req.file) {
      updateData = JSON.parse(req.body.data || "{}");

      const slipUrl = `/uploads/slips/${req.file.filename}`;
      updateData.deposit = {
        amount: Number(updateData.depositAmount || updateData.deposit?.amount),
        slipUrl,
      };
      delete updateData.depositAmount;
    } else {
      updateData = req.body;
    }

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