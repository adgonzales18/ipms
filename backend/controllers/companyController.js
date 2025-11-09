import CompanyModel from "../models/Company.js";

const createCompany = async (req, res) => {
  try {
    const {
      companyName,
      companyAddress,
      companyEmail,
      companyContactName,
      companyContactNumber,
      companyOfficeNumber,
      terms,
    } = req.body;

    // Check if company already exists by name or email
    const existingCompany = await CompanyModel.findOne({
      $or: [{ companyName }, { companyEmail }],
    });

    if (existingCompany) {
      return res
        .status(400)
        .json({ success: false, message: "Company already exists" });
    }

    const newCompany = new CompanyModel({
      companyName,
      companyAddress,
      companyEmail,
      companyContactName,
      companyContactNumber,
      companyOfficeNumber,
      terms,
    });

    await newCompany.save();

    return res
      .status(201)
      .json({ success: true, message: "Company added successfully", data: newCompany });
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getCompany = async (req, res) => {
  try {
    const companies = await CompanyModel.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error in getting companies" });
  }
};


const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      companyAddress,
      companyEmail,
      companyContactName,
      companyContactNumber,
      companyOfficeNumber,
      terms,
    } = req.body;

    const updated = await CompanyModel.findByIdAndUpdate(
      id,
      {
        companyName,
        companyAddress,
        companyEmail,
        companyContactName,
        companyContactNumber,
        companyOfficeNumber,
        terms,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Company updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(500).json({ success: false, message: "Error updating company" });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await CompanyModel.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error deleting company" });
  }
};

export { createCompany, updateCompany, getCompany, deleteCompany };
