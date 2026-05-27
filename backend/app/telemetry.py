import os
import logging
from opentelemetry import trace, metrics
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource


def setup_telemetry(app, engine):
    resource = Resource.create({
        "service.name": "leveluplife-backend",
        "service.version": "0.1.0",
        "deployment.environment": os.getenv("ENVIRONMENT", "production"),
    })

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(
            endpoint=otlp_endpoint,
            insecure=True,
        ))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=otlp_endpoint,
            insecure=True,
        )
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Logs
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(
            endpoint=otlp_endpoint,
            insecure=True,
        ))
    )
    set_logger_provider(logger_provider)

    # Attach OTel to Python's logging system
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    
    # Add to root logger (catches library logs)
    logging.getLogger().addHandler(handler)
    
    # Add explicitly to our app logger (survives uvicorn's log reconfiguration)
    logging.getLogger("leveluplife").addHandler(handler)
    logging.getLogger("leveluplife").setLevel(logging.INFO)

    # Also log to stdout for kubectl logs visibility
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    ))
    logging.getLogger("leveluplife").addHandler(stream_handler)

    # Auto-instrument FastAPI and SQLAlchemy
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)