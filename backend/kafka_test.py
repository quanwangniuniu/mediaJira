# kafka_test.py
from kafka import KafkaProducer, KafkaConsumer

producer = KafkaProducer(bootstrap_servers="${KAFKA_BROKER}")
producer.send('test-topic', b'Hello from Django!')
producer.flush()
print("Message sent from Django")

consumer = KafkaConsumer('test-topic', bootstrap_servers="${KAFKA_BROKER}")
for msg in consumer:
    print("Received:", msg.value.decode('utf-8'))
    break
