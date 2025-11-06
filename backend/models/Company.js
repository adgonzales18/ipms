import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
    {
        companyName: {type: String, required: true},
        companyAddress: {type: String},
        companyEmail : {type: String, required : true}, 
        companyContactName: {type: String},
        companyContactNumber: {type: Number},
        companyOfficeNumber : {type: Number},
    },
    { timestamps: true}
);

const CompanyModel = mongoose.model("Company", CompanySchema);
export default CompanyModel;