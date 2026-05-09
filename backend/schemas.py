from pydantic import BaseModel, Field


class KYCData(BaseModel):
    name: str = Field(description="Holder/person name only, not the document title")
    age: int = Field(description="Explicit printed age, or 0 if no age is printed")
    sex: str = Field(description="Explicit printed sex/gender, or empty string if absent")
    address: str = Field(description="Country of Residence and Address value; do not use Permanent Address in Nepal when residence is visible")
    document_number: str = Field(description="Card ID No, ID Card No, or card number")
