from pydantic import BaseModel, ConfigDict


class EspecialidadeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
