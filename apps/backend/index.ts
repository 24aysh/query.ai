import express from "express"
import multer from "multer"
import fs from "fs"
import pdfParse from "pdf-parse"

const uploads = multer({
    dest:"uploads/" // make this directory if it does not exist
})
const app = express();
app.use(express.json());


app.post("/uploads",uploads.single("pdf"),async (req,res) => {
    const dataBUffer = fs.readFileSync(req.file!.path)
    const pdfData = await pdfParse(dataBUffer);
    const text = pdfData.text
    if(text.length == 0){
        res.status(400).json({
            Error:"Empty pdf or pdf could not be parsed"
        })
    }

    const chunks = text.split("\n\n");
    res.status(200).json({
        totalChunks : chunks.length,
        chunks
    })

})

app.listen(3001,() =>{
    console.log("🚀 Server Running on port 3001")
})