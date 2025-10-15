import logging
import boto3
from botocore.exceptions import ClientError
from pathlib import Path

from platform_interface.config import settings

log = logging.getLogger(__name__)
gui_logger = logging.getLogger("platform_interface.gui")


class S3Uploader:
    """
    Class for uploading files to an AWS S3 bucket.
    This class is responsible for uploading assay log files to an S3 bucket
    at the conclusion of an assay.
    """

    def __init__(self):
        """Initialize the S3Uploader with AWS credentials from settings."""
        self.aws_access_key_id = settings.aws_access_key_id
        self.aws_secret_access_key = settings.aws_secret_access_key
        self.s3_client = None

    def _initialize_s3_client(self):
        """Initialize the S3 client with AWS credentials."""
        if not self.s3_client:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                )
                log.debug("S3 client initialized successfully")
            except Exception as e:
                log.exception("Failed to initialize S3 client: %s", e)
                raise

    def upload_file(self, file_path: str, bucket_name: str, object_name: str = None):
        """
        Upload a file to an S3 bucket.

        Args:
            file_path (str): Path to the file to upload
            bucket_name (str): Name of the S3 bucket
            object_name (str, optional): S3 object name. If not specified, file_name is used

        Returns:
            bool: True if file was uploaded, else False
        """
        # If S3 object_name was not specified, use file_name
        if object_name is None:
            file_name = Path(file_path).name
            # Prepend the bucket path if it exists
            if settings.aws_s3_bucket_path:
                # Ensure the bucket path ends with a slash
                bucket_path = settings.aws_s3_bucket_path
                if not bucket_path.endswith("/"):
                    bucket_path += "/"
                object_name = f"{bucket_path}{file_name}"
            else:
                object_name = file_name

        # Initialize S3 client if not already initialized
        self._initialize_s3_client()

        try:
            self.s3_client.upload_file(file_path, bucket_name, object_name)
            log.info(
                "Successfully uploaded %s to %s/%s", file_path, bucket_name, object_name
            )
            gui_logger.info(
                "Successfully uploaded %s to S3 bucket %s", file_path, bucket_name
            )
            return True
        except ClientError as e:
            log.error("Error uploading file to S3: %s", e)
            gui_logger.warning(
                "Failed to upload %s to S3 bucket %s: %s", file_path, bucket_name, e
            )
            return False
        except Exception as e:
            log.exception("Unexpected error uploading file to S3: %s", e)
            gui_logger.warning(
                "Failed to upload %s to S3 bucket %s: %s", file_path, bucket_name, e
            )
            return False


__all__ = ["S3Uploader", "gui_logger"]
