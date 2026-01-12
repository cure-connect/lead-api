import { AdminModel, BranchModel, ChannelModel, InterestModel } from "../models/settings"

interface CreateSetting {
    id: number,
    name: string,
    price: string
}

export const createSetting = async (body: CreateSetting): Promise<CreateSetting> => {
    try {
        const create = await InterestModel.create({
            name: body.name,
            price: Number(body.price)
        });

        return {
            id: create.id,
            name: create.name,
            price: String(create.price)
        };

    } catch (error) {
        throw error;
    }
}

//Admin
export const createAdmin = async (payload: { name: string }) => {
    try {
        const result = await AdminModel.create(payload)
        return result
    } catch (error) {
        throw error
    }
};

export const getAllAdmin = async () => {
    try {
        const result = await AdminModel.find({})
        return result
    } catch (error) {
        throw error
    }
}

export const getAdminById = async (id: number) => {
    try {
        const result = await AdminModel.findOne({ id }).lean()
        return result
    } catch (error) {
        throw error
    }
}

export const editAdminName = async (id: number, name: string) => {
    try {
        const result = await AdminModel.findOneAndUpdate(
            { id },
            { $set: { name } },
            { new: true, lean: true }
        );
        return result
    } catch (error) {
        throw error;
    }
};

export const deleteAdminById = async (id: number) => {
    try {
        const result = await AdminModel.findOneAndDelete({ id }).lean();
        return result;
    } catch (error) {
        throw error;
    }
};



//Branch
export const createBranch = async (payload: { name: string }) => {
    try {
        const result = await BranchModel.create(payload);
        return result
    } catch (error) {
        throw error
    }
};

export const getAllBranch = async () => {
    try {
        return await BranchModel.find({}).lean();
    } catch (error) {
        throw error;
    }
};

export const getBranchById = async (id: number) => {
    try {
        return await BranchModel.findOne({ id }).lean();
    } catch (error) {
        throw error;
    }
};

export const editBranchName = async (id: number, name: string) => {
    try {
        const result = await BranchModel.findOneAndUpdate(
            { id },
            { $set: { name } },
            { new: true, lean: true }
        );
        return result
    } catch (error) {
        throw error;
    }
};

export const deleteBranchById = async (id: number) => {
    try {
        return await BranchModel.findOneAndDelete({ id }).lean();
    } catch (error) {
        throw error;
    }
};

//Channels
export const createChannel = async (payload: { name: string }) => {
    try {
        const result = await ChannelModel.create(payload);
        return result
    } catch (error) {
        throw error
    }
};

export const getAllChannel = async () => {
    try {
        return await ChannelModel.find({}).lean();
    } catch (error) {
        throw error;
    }
};

export const getChannelById = async (id: number) => {
    try {
        return await ChannelModel.findOne({ id }).lean();
    } catch (error) {
        throw error;
    }
};

export const editChannelName = async (id: number, name: string) => {
    try {
        return await ChannelModel.findOneAndUpdate(
            { id },
            { $set: { name } },
            { new: true, lean: true }
        );
    } catch (error) {
        throw error;
    }
};

export const deleteChannelById = async (id: number) => {
    try {
        return await ChannelModel.findOneAndDelete({ id }).lean();
    } catch (error) {
        throw error;
    }
};

//Interests
export const createInterest = async (payload: { name: string; price: string }) => {
    if (!payload.price) {
        throw new Error("price is required for interest");
    }
    try {
        const result = await InterestModel.create({
            name: payload.name,
            price: Number(payload.price)
        });
        return result
    } catch (error) {
        throw error
    }
};

export const getAllInterest = async () => {
    try {
        return await InterestModel.find({}).lean();
    } catch (error) {
        throw error;
    }
};

export const getInterestById = async (id: number) => {
    try {
        return await InterestModel.findOne({ id }).lean();
    } catch (error) {
        throw error;
    }
};

export const editInterest = async (
    id: number,
    payload: { name?: string; price?: string }
) => {
    try {
        const updatePayload: { name?: string; price?: number } = {};
        if (payload.name !== undefined) updatePayload.name = payload.name;
        if (payload.price !== undefined) updatePayload.price = Number(payload.price);
        
        return await InterestModel.findOneAndUpdate(
            { id },
            { $set: updatePayload },
            { new: true, lean: true }
        );
    } catch (error) {
        throw error;
    }
};

export const deleteInterestById = async (id: number) => {
    try {
        return await InterestModel.findOneAndDelete({ id }).lean();
    } catch (error) {
        throw error;
    }
};