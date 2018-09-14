```sh
docker run -it --rm -p 2181:2181 confluent/zookeeper
docker run -it --rm -p 9092:9092 wurstmeister/kafka:0.9.0.0-1
docker run -it --rm -p 9000:9000 -e APPLICATION_SECRET=letmein sheepkiller/kafka-manager
npm start
```

Plan:
- optimize/solve with Spark [TFOCS](https://databricks.com/blog/2015/11/02/announcing-the-spark-tfocs-optimization-package.html)?
