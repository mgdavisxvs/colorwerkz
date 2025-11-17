# Placeholder for U-Net model loading logic
class UNetModel:
    def __init__(self):
        self.loaded = False

    def load(self, path: str):
        # TODO: implement actual model loading
        self.loaded = True

    def infer(self, image_bytes: bytes):
        # TODO: run inference
        return {
            "delta_e": 25.13,
            "result_image": image_bytes,
        }
