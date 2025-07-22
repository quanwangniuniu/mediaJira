FROM python:3.10

WORKDIR /app

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .


CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"] 